import { PartialType } from '@nestjs/swagger';
import { AssignTaskDto } from '@app/rest/event-resources/tasks/dto/assign-task.dto';

export class UpdateTaskDto extends PartialType(AssignTaskDto) {}
