import { User } from '@app/rest/users/entities/user.entity';
import { UserExportDto } from '../dto/export-user-dto';

export class ExportData {
  userEmail: string;
  recordsToExport: UserExportDto[];
}
