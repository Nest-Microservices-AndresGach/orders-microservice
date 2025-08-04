import { IsNumber, IsPositive } from 'class-validator';

export class OrderItemDto {
  @IsNumber()
  @IsPositive()
  productId: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  //*Size: string; en caso de ser alguna tienda de ropa

  @IsNumber()
  @IsPositive()
  price: number; //* Esta propiedad no sería necesaria porque se saca de la base de datos del otro lado pero por dinamizar el curso el profe lo agregó
}
