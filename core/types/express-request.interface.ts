import { Request } from 'express';
import { Staff } from 'src/staff/entities/staff.entity';

export interface ExpressRequest extends Request {
  staff: Omit<Staff, 'password'> | null;
}
