import type { Procedure } from '@/types';
import tamTru from './tam-tru.json';
import capLaiCanCuoc from './cap-lai-can-cuoc.json';

// Thêm thủ tục mới: tạo file JSON cùng cấu trúc rồi thêm vào mảng này.
export const procedures = [tamTru, capLaiCanCuoc] as Procedure[];

export function getProcedure(id: string | null | undefined): Procedure | undefined {
  return procedures.find((p) => p.id === id);
}
