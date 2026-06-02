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
export class DelhiveryAdapter implements ShippingProvider {
  private readonly logger = new Logger(DelhiveryAdapter.name);

  async createShipment(dto: CreateShipmentDto): Promise<ShipmentResponse> {
    this.logger.log(`Delhivery: Creating shipment for order ${dto.orderId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockShipmentId = `DELI-SH-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      shipmentId: mockShipmentId,
      awb: null,
      status: ShipmentStatus.PENDING,
      edd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      carrierMetadata: { serviceMode: 'Express' },
    };
  }

  async generateAwb(shipmentId: string): Promise<AwbResponse> {
    this.logger.log(`Delhivery: Generating AWB for shipment ${shipmentId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockAwb = `DELI-AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      awb: mockAwb,
      edd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      carrierMetadata: { node: 'DEL-OUTFIT' },
    };
  }

  async printLabel(shipmentId: string): Promise<LabelResponse> {
    await Promise.resolve();
    this.logger.log(`Delhivery: Fetching label for ${shipmentId}`);
    return {
      labelUrl: `https://nexaris-bucket.s3.amazonaws.com/labels/delhivery-${shipmentId}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  async schedulePickup(
    shipmentId: string,
    pickupTime: Date,
  ): Promise<{ success: boolean; scheduledTime: Date }> {
    await Promise.resolve();
    this.logger.log(
      `Delhivery: Scheduling pickup for shipment ${shipmentId} at ${pickupTime.toISOString()}`,
    );
    return { success: true, scheduledTime: pickupTime };
  }

  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    await Promise.resolve();
    this.logger.log(`Delhivery: Tracking ${awb}`);
    return [
      {
        status: 'MANIFESTED',
        description: 'AWB generated and packet assigned',
        eventTime: new Date(Date.now() - 4 * 3600000),
        location: 'Delhi Central',
      },
    ];
  }

  async createReturn(dto: CreateShipmentDto): Promise<ReturnResponse> {
    await Promise.resolve();
    this.logger.log(`Delhivery: Initializing return for order ${dto.orderId}`);
    const mockRetId = `DELI-RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockRetAwb = `DELI-RAWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      returnShipmentId: mockRetId,
      returnAwb: mockRetAwb,
      status: ReturnRequestStatus.PENDING,
      carrierMetadata: { mode: 'Reverse Express' },
    };
  }
}
