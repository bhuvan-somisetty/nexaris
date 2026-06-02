import { ShipmentStatus, ReturnRequestStatus } from '@prisma/client';

export interface CreateShipmentDto {
  orderId: string;
  sellerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  totalWeightGrams: number;
}

export interface ShipmentResponse {
  awb: string | null;
  shipmentId: string;
  status: ShipmentStatus;
  edd: Date | null;
  carrierMetadata?: Record<string, any>;
}

export interface AwbResponse {
  awb: string;
  edd: Date | null;
  carrierMetadata?: Record<string, any>;
}

export interface LabelResponse {
  labelUrl: string | null;
  labelData?: string;
  mimeType: string;
}

export interface ReturnResponse {
  returnAwb: string;
  returnShipmentId: string;
  status: ReturnRequestStatus;
  carrierMetadata?: Record<string, any>;
}

export interface TrackingEvent {
  status: string;
  location?: string;
  description: string;
  eventTime: Date;
}

export interface ShippingProvider {
  createShipment(dto: CreateShipmentDto): Promise<ShipmentResponse>;
  generateAwb(shipmentId: string): Promise<AwbResponse>;
  printLabel(shipmentId: string): Promise<LabelResponse>;
  schedulePickup(
    shipmentId: string,
    pickupTime: Date,
  ): Promise<{ success: boolean; scheduledTime: Date }>;
  trackShipment(awb: string): Promise<TrackingEvent[]>;
  createReturn(dto: CreateShipmentDto): Promise<ReturnResponse>;
}
