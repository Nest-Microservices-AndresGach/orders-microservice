import {
  Controller,
  Inject,
  NotImplementedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ClientProxy,
  EventPattern,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { changeOrderStatusDto } from './dto';
import { PRODUCT_SERVICE } from 'src/config';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // * ABAJO PODEMOS VER QUE EN VEZ DE MESSAGEPATTERN (M.P.) HAY UN EVENTPATTERN, LA DIFERENCIA ES QUE EL E.P. SOLO ESCUCHA, MIENTRAS QUE M.P. ENVÍA Y RECIBE INFORMACIÓN
  @MessagePattern({ cmd: 'createOrder' })
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);

    return {
      order,
      paymentSession,
    };
  }

  @MessagePattern({ cmd: 'findAllOrders' })
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern({ cmd: 'findOneOrder' })
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'changeOrderStatus' })
  changeOrderStatus(@Payload() changeOrderStatusDto: changeOrderStatusDto) {
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  // @MessagePattern() // * De hecho se pueden colocar ambos al tiempo en caso de que se requiera pero en este ejemplo no. Solamente lo puse para acordarme.
  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: any) {
    console.log({ paidOrderDto });
    return this.ordersService.paidOrder(paidOrderDto);
  }
}
