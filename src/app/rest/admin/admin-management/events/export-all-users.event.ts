import { ExportData } from "../entities/export-data.entity";

export class AllUsersExportEvent {
    constructor(public readonly exportData: ExportData) {}
}