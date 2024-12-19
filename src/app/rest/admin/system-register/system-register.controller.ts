import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SystemRegisterService } from './system-register.service';
import { CreateSystemRegisterDto } from './dto/create-system-register.dto';
import { UpdateSystemRegisterDto } from './dto/update-system-register.dto';

@Controller('system-register')
export class SystemRegisterController {
  constructor(private readonly systemRegisterService: SystemRegisterService) {}

  @Post()
  create(@Body() createSystemRegisterDto: CreateSystemRegisterDto) {
    return this.systemRegisterService.create(createSystemRegisterDto);
  }

  @Get()
  findAll() {
    return this.systemRegisterService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemRegisterService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSystemRegisterDto: UpdateSystemRegisterDto,
  ) {
    return this.systemRegisterService.update(+id, updateSystemRegisterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.systemRegisterService.remove(+id);
  }
}
