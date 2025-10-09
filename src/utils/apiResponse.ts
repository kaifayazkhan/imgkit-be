import type { Response } from 'express';

class ApiResponse<T> {
  status: number;
  data: T;
  success: boolean;
  message?: string;
  meta?: Record<string, any>;

  constructor(
    status: number,
    data: T,
    message?: string,
    meta?: Record<string, any>
  ) {
    this.status = status;
    this.data = data;
    this.success = status >= 200 && status < 400;

    if (message) {
      this.message = message;
    }

    if (meta) {
      this.meta = meta;
    }
  }

  send(res: Response) {
    return res.status(this.status).json({
      success: this.success,
      message: this.message,
      data: this.data,
      ...(this.meta ? { meta: this.meta } : {}),
    });
  }
}

export default ApiResponse;
