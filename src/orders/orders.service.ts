import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from 'generated/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { changeOrderStatusDto, OrderItemDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  constructor(
    @Inject(NATS_SERVICE) private readonly productClient: ClientProxy,
  ) {
    super();
  }

  private readonly logger = new Logger('Orders Service');
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database Connected');
  }
  async create(createOrderDto: CreateOrderDto) {
    try {
      //Confirmar Ids de productos
      const productIds = createOrderDto.items.map((item) => item.productId);
      const products: any[] = await firstValueFrom(
        this.productClient.send(
          //* Si no coloco "firstValueFrom" sería una funcion de tipo observable, este la transforma a una promesa
          { cmd: 'validate_products' },
          productIds,
        ),
      );
      //Calcular valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id == orderItem.productId,
        ).price;
        return acc + price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      //Crear transaccion de db
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(
                  (product) => product.id == orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          }, //* Esto hace que incluya los valores de la orden
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id == orderItem.productId)
            .name,
        })),
      };
    } catch (error) {}
    throw new RpcException({
      status: HttpStatus.BAD_REQUEST,
      message: 'Check Logs',
    });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: { status: orderPaginationDto.status },
    });
    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;
    const lastPage = Math.ceil(totalPages / perPage);

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id: id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });
    if (!order)
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });

    const productIds = order.OrderItem.map((orderItem) => orderItem.productId);

    const products: any[] = await firstValueFrom(
      this.productClient.send({ cmd: 'validate_products' }, productIds),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id == orderItem.productId)
          .name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: changeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id); //*Esto no sería eficiente en caso de hacer un bulk update o algo así, consume más porque hace doble peticion a db pero al ser de solo 1 producto todo bien
    if (order.status == status) {
      //*Esta validacion es por si el objeto tiene el mismo estado no lo actualice, pero queda a discreción de ti si quieres que se actualice igual o solo retorne
      return order;
    }
    return this.order.update({
      where: { id },
      data: { status: status },
    });
  }
}
