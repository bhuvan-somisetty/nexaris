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
export class BlueDartAdapter implements ShippingProvider {
  private readonly logger = new Logger(BlueDartAdapter.name);

  async createShipment(dto: CreateShipmentDto): Promise<ShipmentResponse> {
    this.logger.log(`BlueDart: Creating shipment for order ${dto.orderId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockShipmentId = `BD-SH-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      shipmentId: mockShipmentId,
      awb: null,
      status: ShipmentStatus.PENDING,
      edd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      carrierMetadata: { tier: 'Premium Air' },
    };
  }

  async generateAwb(shipmentId: string): Promise<AwbResponse> {
    this.logger.log(`BlueDart: Generating AWB for shipment ${shipmentId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mockAwb = `BD-AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      awb: mockAwb,
      edd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      carrierMetadata: { routeCode: 'BD-AIR-101' },
    };
  }

  async printLabel(shipmentId: string): Promise<LabelResponse> {
    await Promise.resolve();
    this.logger.log(`BlueDart: Fetching label for ${shipmentId}`);
    return {
      labelUrl: `https://nexaris-bucket.s3.amazonaws.com/labels/bluedart-${shipmentId}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  async schedulePickup(
    shipmentId: string,
    pickupTime: Date,
  ): Promise<{ success: boolean; scheduledTime: Date }> {
    await Promise.resolve();
    this.logger.log(
      `BlueDart: Scheduling pickup for shipment ${shipmentId} at ${pickupTime.toISOString()}`,
    );
    return { success: true, scheduledTime: pickupTime };
  }

  async trackShipment(awb: string): Promise<TrackingEvent[]> {
    await Promise.resolve();
    this.logger.log(`BlueDart: Tracking ${awb}`);
    return [
      {
        status: 'BOOKED',
        description: 'BlueDart air packet booked',
        eventTime: new Date(Date.now() - 2 * 3600000),
        location: 'Mumbai Airport',
      },
    ];
  }

  async createReturn(dto: CreateShipmentDto): Promise<ReturnResponse> {
    await Promise.resolve();
    this.logger.log(`BlueDart: Initializing return for order ${dto.orderId}`);
    const mockRetId = `BD-RET-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockRetAwb = `BD-RAWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    return {
      returnShipmentId: mockRetId,
      returnAwb: mockRetAwb,
      status: ReturnRequestStatus.PENDING,
      carrierMetadata: { reverseMode: 'Premium Ground Return' },
    };
  }
}
