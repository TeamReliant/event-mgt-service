import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { SelectQueryBuilder } from 'typeorm';

export interface IResponseWithMessage {
  status: string;
  message: string;
}

export interface IResponseWithData {
  status: string;
  data: any;
}

export interface IResponseWithDataCollection {
  status: string;
  results?: number;
  data: any[];
}

export interface IFilterableCollection {
  length: number;
  data: any;
}

class ResponseSerializer {
  public response() {
    return {
      status: 'SUCCESS',
    };
  }

  public static message(message: string): IResponseWithMessage {
    return {
      status: 'SUCCESS',
      message,
    };
  }

  public static data(data: any): IResponseWithData {
    return {
      status: 'SUCCESS',
      data,
    };
  }

  public static dataAndCollection(
    response_data: IFilterableCollection,
  ): IResponseWithDataCollection {
    const { length, data } = response_data;
    return {
      status: 'SUCCESS',
      results: length,
      data: data,
    };
  }

  public static collection(
    data: any[],
    collection_length: number,
  ): IResponseWithDataCollection {
    return {
      status: 'SUCCESS',
      results: collection_length,
      data: data,
    };
  }

  public static async applyHTEAOS(
    request: Request,
    queryBuilder: SelectQueryBuilder<any>,
  ) {
    const { query } = request;

    const { page, perPage } = query;

    const currentPage = +page || 1;
    const itemsPerPage = +perPage || 10;

    // Calculate the offset based on the current page and items per page
    const offset = (currentPage - 1) * itemsPerPage;

    queryBuilder.skip(offset).take(itemsPerPage);

    // Fetch data and count
    const [data, total] = await queryBuilder.getManyAndCount();

    // Calculate other pagination properties
    const totalPages = Math.ceil(total / itemsPerPage);
    const nextPage = currentPage < totalPages ? +currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    let baseUrl = request.originalUrl; // Retrieve the base URL dynamically from the request object
    baseUrl = baseUrl.split('?').shift(); // Remove the query string from the URL
    // get current app domain with protocol
    const domain = request.get('host');
    const protocol = request.protocol;
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
      per_page: +perPage,
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
   * applyHTEAOSWithDtoFormatter: Formats the data to be returned with the DTO class
   * @param request Request object
   * @param queryBuilder queryBuilder object
   * @param dtoClass DTO class to format the data
   * @returns the formatted data per page
   */
  public static async applyHTEAOSWithDtoFormatter<T>(
    request: Request,
    queryBuilder: SelectQueryBuilder<any>,
    dtoClass: new () => T,
  ) {
    const { query } = request;

    const { page, perPage } = query;

    const currentPage = +page || 1;
    const itemsPerPage = +perPage || 10;

    // Calculate the offset based on the current page and items per page
    const offset = (currentPage - 1) * itemsPerPage;

    queryBuilder.skip(offset).take(itemsPerPage);

    // Fetch data and count
    let [data, total] = await queryBuilder.getManyAndCount();

    // Calculate other pagination properties
    const totalPages = Math.ceil(total / itemsPerPage);
    const nextPage = currentPage < totalPages ? +currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    let baseUrl = request.originalUrl; // Retrieve the base URL dynamically from the request object
    baseUrl = baseUrl.split('?').shift(); // Remove the query string from the URL
    // get current app domain with protocol
    const domain = request.get('host');
    const protocol = request.protocol;
    baseUrl = `${protocol}://${domain}${baseUrl}`;

    const currentPageUrl = `${baseUrl}?page=${currentPage}&perPage=${itemsPerPage}`;
    const previousPageUrl = prevPage
      ? `${baseUrl}?page=${prevPage}&perPage=${itemsPerPage}`
      : null;
    const nextPageUrl = nextPage
      ? `${baseUrl}?page=${nextPage}&perPage=${itemsPerPage}`
      : null;

    data = plainToInstance(dtoClass, data, {
      excludeExtraneousValues: true,
    });

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
      per_page: +perPage,
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

  public static async applyHTEAOSAsync(
    request: Request,
    queryBuilder: SelectQueryBuilder<any>,
  ) {
    const { query } = request;

    const { page, perPage } = query;

    const currentPage = +page || 1;
    const itemsPerPage = +perPage || 10;

    // Calculate the offset based on the current page and items per page
    const offset = (currentPage - 1) * itemsPerPage;

    queryBuilder.skip(offset).take(itemsPerPage);

    // Fetch data and count
    const [data, total] = await queryBuilder.getManyAndCount();

    // Calculate other pagination properties
    const totalPages = Math.ceil(total / itemsPerPage);
    const nextPage = currentPage < totalPages ? +currentPage + 1 : null;
    const prevPage = currentPage > 1 ? currentPage - 1 : null;

    let baseUrl = request.originalUrl; // Retrieve the base URL dynamically from the request object
    baseUrl = baseUrl.split('?').shift(); // Remove the query string from the URL
    // get current app domain with protocol
    const domain = request.get('host');
    const protocol = request.protocol;
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
      per_page: +perPage,
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
}

export default ResponseSerializer;
