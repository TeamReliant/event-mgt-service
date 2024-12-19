import { Injectable } from '@nestjs/common';
import { CreateSystemRegisterDto } from './dto/create-system-register.dto';
import { UpdateSystemRegisterDto } from './dto/update-system-register.dto';

@Injectable()
export class SystemRegisterService {
  create(createSystemRegisterDto: CreateSystemRegisterDto) {
    return 'This action adds a new systemRegister';
  }

  findAll() {
    return `This action returns all systemRegister`;
  }

  findOne(id: number) {
    return `This action returns a #${id} systemRegister`;
  }

  update(id: number, updateSystemRegisterDto: UpdateSystemRegisterDto) {
    return `This action updates a #${id} systemRegister`;
  }

  remove(id: number) {
    return `This action removes a #${id} systemRegister`;
  }
}
