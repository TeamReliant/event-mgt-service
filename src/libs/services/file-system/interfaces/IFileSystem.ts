export default interface IFileSystem {
  uploadFileAsync(file: Express.Multer.File): Promise<string>;
  deleteFileAsync(objectURL: string): Promise<boolean>;
}
