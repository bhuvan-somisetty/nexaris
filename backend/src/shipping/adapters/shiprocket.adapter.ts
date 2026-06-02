import { Injectable, Logger } from '@nestjs/common';
import {
  CreateShipmentDto,
  ShippingProvider,
  ShipmentResponse,
  AwbResponse,
  LabelResponse,
  ReturnResponse,
  TrackingEvent,
} from '../interfaces/shipping-provider.interface';
import { ShipmentStatus, ReturnRequestStatus } from '@prisma/client';

@Injectable()
export class ShiprocketAdapter implements ShippingProvider {
  private readonly logger = new Logger(ShiprocketAdapter.name);

  async createShipment(dto: CreateShipmentDto): Promise<ShipmentResponse> {
    this.logger.log(`Shiprocket: Creating shipment for order ${dto.orderId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockShipmentId = `SR-SH-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      shipmentId: mockShipmentId,
      awb: null,
      status: ShipmentStatus.PENDING,
      edd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      carrierMetadata: {
        serviceName: 'Shiprocket Surface',
        weightCharged: dto.totalWeightGrams,
      },
    };
  }

  async generateAwb(shipmentId: string): Promise<AwbResponse> {
    this.logger.log(`Shiprocket: Generating AWB for shipment ${shipmentId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockAwb = `SR-AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      awb: mockAwb,
      edd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      carrierMetadata: { routing: 'DEL-HUB-NORTH' },
    };
  }

  async printLabel(shipmentId: string): Promise<LabelResponse> {
    await Promise.resolve();
    this.logger.log(`Shiprocket: Printing label for ${shipmentId}`);
    return {
      labelUrl: `https://nexaris-bucket.s3.amazonaws.com/labels/shiprocket-${shipmentId}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  async schedulePickup(
    shipmentId: string,
    pickupTime: Date,
  ): Promise<{ success: boolean; scheduledTime: Date }> {
    await Promise.resolve();
    this.logger.log(
      `Shiprocket: Scheduling pickup for shipment ${shipmentId} at ${pickupTime.toISOString()}`,
    );
    return { success: true, scheduledTime: pickupTime };
  }

  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    await Promise.resolve();
    this.logger.log(`Shiprocket: Tracking ${awb}`);
    return [
      {
        status: 'SHIPMENT_CREATED',
        description: 'Shipment created successfully',
        eventTime: new Date(Date.now() - 6 * 3600000),
        location: 'Seller Warehouse',
      },
    ];
  }

  async createReturn(dto: CreateShipmentDto): Promise<ReturnResponse> {
    await Promise.resolve();
    this.logger.log(`Shiprocket: Initializing return for order ${dto.orderId}`);
    const mockRetId = `SR-RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockRetAwb = `SR-RAWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      returnShipmentId: mockRetId,
      returnAwb: mockRetAwb,
      status: ReturnRequestStatus.PENDING,
      carrierMetadata: { reverseService: 'Surface Reverse' },
    };
  }
}
