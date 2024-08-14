import { Injectable } from '@nestjs/common';
import IFileSystem from '@libs/services/file-system/interfaces/IFileSystem';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AzureBlobFileSystemService implements IFileSystem {
  private readonly azureConnection: string;
  private readonly containerName = 'uploads'; // Choose a container name

  constructor(private readonly configService: ConfigService) {
    this.azureConnection = this.configService.getOrThrow(
      'AZURE_BLOB_STORAGE_CONNECTION_STRING',
    );
    this.containerName = this.configService.getOrThrow(
      'AZURE_BLOB_STORAGE_CONTAINER_NAME',
    );
  }

  private getBlobClient(filename: string): BlockBlobClient {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      this.azureConnection,
    );
    const containerClient = blobServiceClient.getContainerClient(
      this.containerName,
    );
    return containerClient.getBlockBlobClient(filename);
  }

  async uploadFileAsync(file: Express.Multer.File): Promise<string> {
    // Fetch the extension of the file
    const extension = file.mimetype.split('/')[1];
    // Generate a unique filename with the extension
    const blobClient = this.getBlobClient(`${uuidv4()}.${extension}`);
    await blobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });
    return blobClient.url;
  }

  async deleteFileAsync(objectUrl: string): Promise<boolean> {
    // fetch the azure blob storage url
    const azureBlobStorageUrl = this.configService.getOrThrow(
      'AZURE_BLOB_STORAGE_URL',
    );
    // Extract the filename from the object URL
    const filename = objectUrl.replace(azureBlobStorageUrl, '');

    console.log(filename);

    const blobClient = this.getBlobClient(filename);
    await blobClient.delete();
    return true;
  }
}
