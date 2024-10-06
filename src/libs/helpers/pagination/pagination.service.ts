import { Inject, Injectable, NotAcceptableException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Paginated } from '@libs/helpers/pagination/interfaces/paginated.interface';
import { Request } from 'express';
import { PaginationQueryDto } from '@libs/helpers/pagination/dto/pagination.query.dto';

@Injectable()
export class PaginationService {
  constructor(
    @Inject(REQUEST)
    private readonly request: Request,
    private readonly dataSource: DataSource,
  ) {}

  public async paginateQuery<T extends ObjectLiteral>(
    paginationQuery: PaginationQueryDto,
    repository: Repository<T>,
  ): Promise<Paginated<T>> {
    const results = await repository.find({
      skip: (paginationQuery.page - 1) * paginationQuery.limit,
      take: paginationQuery.limit,
    });

    /**
     * Create the request URLs
     */
    const baseURL =
      this.request.protocol + '://' + this.request.headers.host + '/';
    const newUrl = new URL(this.request.url, baseURL);

    // Calculate page numbers
    const totalItems = await repository.count();
    const totalPages = Math.ceil(totalItems / paginationQuery.limit);
    const nextPage =
      paginationQuery.page === totalPages
        ? paginationQuery.page
        : paginationQuery.page + 1;
    const previousPage =
      paginationQuery.page === 1
        ? paginationQuery.page
        : paginationQuery.page - 1;

    return {
      data: results,
      meta: {
        itemsPerPage: paginationQuery.limit,
        totalItems: totalItems,
        currentPage: paginationQuery.page,
        totalPages: Math.ceil(totalItems / paginationQuery.limit),
      },
      links: {
        first: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=1`,
        last: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${totalPages}`,
        current: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${paginationQuery.page}`,
        next: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${nextPage}`,
        previous: `${newUrl.origin}${newUrl.pathname}?limit=${paginationQuery.limit}&page=${previousPage}`,
      },
    };
  }

  public async applyHTEAOS<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ) {
    const { query } = this.request;

    // 1. Apply filters
    queryBuilder = this.applyFilter<T>(queryBuilder);

    // 2. Apply sorting
    queryBuilder = this.applySorting<T>(queryBuilder);

    const { page, limit } = query;

    const currentPage = +page || 1;
    const itemsPerPage = +limit || 10;

    // Calculate the offset based on the current page and items per page
    const offset = (currentPage - 1) * itemsPerPage;

    queryBuilder.skip(offset).take(itemsPerPage);

    // Fetch data and count
    const [data, total] = await queryBuilder.getManyAndCount();

    // Calculate other pagination properties
    const totalPages = Math.ceil(total / itemsPerPage);
    const nextPage = currentPage < totalPages ? +currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    let baseUrl = this.request.originalUrl; // Retrieve the base URL dynamically from the request object
    baseUrl = baseUrl.split('?').shift(); // Remove the query string from the URL
    // get current app domain with protocol
    const domain = this.request.get('host');
    const protocol = this.request.protocol;
    baseUrl = `${protocol}://${domain}${baseUrl}`;

    const currentPageUrl = `${baseUrl}?page=${currentPage}&perPage=${itemsPerPage}`;
    const previousPageUrl = prevPage
      ? `${baseUrl}?page=${prevPage}&perPage=${itemsPerPage}`
      : null;
    const nextPageUrl = nextPage
      ? `${baseUrl}?page=${nextPage}&perPage=${itemsPerPage}`
      : null;

    const response = {
      current_page: +currentPage,
      total_pages: totalPages,
      data,
      first_page_url: `${baseUrl}?page=1&perPage=${itemsPerPage}`,
      from: offset + 1,
      last_page: totalPages,
      last_page_url: `${baseUrl}?page=${totalPages}&perPage=${itemsPerPage}`,
      links: [
        { url: previousPageUrl, label: '&laquo; Previous', active: !!prevPage },
        { url: currentPageUrl, label: currentPage, active: true },
        { url: nextPageUrl, label: 'Next &raquo;', active: !!nextPage },
      ],
      next_page_url: nextPage
        ? `${baseUrl}?page=${nextPage}&perPage=${itemsPerPage}`
        : null,
      path: `${baseUrl}`,
      per_page: +limit,
      prev_page_url: prevPage
        ? `${baseUrl}?page=${prevPage}&perPage=${itemsPerPage}`
        : null,
      to: offset + data.length,
      total,
    };

    return {
      status: 'SUCCESS',
      ...response,
    };
  }

  /**
   * Apply filters to the query builder
   * @param queryBuilder
   * @private applyFilter
   * @returns SelectQueryBuilder
   */
  private applyFilter<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    const { query } = this.request;

    // retrieve the main alias from the query builder
    const mainAlias = queryBuilder.expressionMap.mainAlias?.name;
    // retrieve the entity class from the query builder
    const entityClass = queryBuilder.expressionMap.mainAlias?.target;
    // retrieve the metadata for the entity class
    const metadata = this.dataSource.getMetadata(entityClass);
    // retrieve the column names from the metadata
    const columns = metadata.columns.map((column) => column.propertyName);
    // filter out the columns that are not in the query
    for (const column in columns) {
      // check if the column is in the query
      if (query[columns[column]]) {
        // add the where clause to the query builder
        queryBuilder.andWhere(
          `${mainAlias}.${columns[column]} = :${columns[column]}`,
          {
            [columns[column]]: query[columns[column]],
          },
        );
      }
    }

    // return the query builder
    return queryBuilder;
  }

  /**
   * Apply sorting to the query builder
   * @param queryBuilder
   * @private applySorting
   * @returns SelectQueryBuilder
   */
  private applySorting<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    const { query } = this.request;

    // retrieve the main alias from the query builder
    const mainAlias = queryBuilder.expressionMap.mainAlias?.name;
    // retrieve the entity class from the query builder
    const entityClass = queryBuilder.expressionMap.mainAlias?.target;
    // retrieve the metadata for the entity class
    const metadata = this.dataSource.getMetadata(entityClass);
    // retrieve the column names from the metadata
    const columns = metadata.columns.map((column) => column.propertyName);

    // check for sortBy and sortDir from the query and apply it to the query builder
    if (query.sortBy && query.sortDir) {
      let sortBy = query.sortBy as string;
      sortBy = sortBy.toLowerCase();
      let sortDir = query.sortDir as string;
      sortDir = sortDir.toUpperCase();

      // check if the entity contains the column
      if (!columns.includes(sortBy))
        throw new NotAcceptableException(`Invalid column [${sortBy}]`);

      // check if sortDir is valid
      if (!['ASC', 'DESC'].includes(sortDir))
        throw new NotAcceptableException(`Invalid sort direction [${sortDir}]`);

      queryBuilder.orderBy(`${mainAlias}.${sortBy}`, sortDir as 'ASC' | 'DESC');
    }

    // return the query builder
    return queryBuilder;
  }
}
