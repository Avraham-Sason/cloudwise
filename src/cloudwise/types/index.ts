import type { Timestamp } from "firebase-admin/firestore";

/// tariff types
export interface TariffItem {
    Text: string | null;
    Currency: string;
    Prices: {
        Type: number;
        Price: number;
        Vat: number;
    }[];
    From: string;
    To: string;
    DaysOfWeek: string[];
}

export interface ParsedTariffItem {
    text: string | null;
    currency: string;
    prices: {
        type: number;
        price: number;
        vat: number;
    }[];
    from: Timestamp;
    to: Timestamp;
    days_of_week: string[];
}

export interface TariffDetails {
    PricePerKwh: number;
    ConnectionFee: number;
    ParkingFee: number | null;
    Currency: string;
    TariffItems: TariffItem[];
    ErrorMessage: string | null;
    ErrorCode: number;
}

export interface ParsedTariffDetails {
    price_per_kwh: number;
    connection_fee: number;
    parking_fee: number | null;
    currency: string;
    tariff_items: ParsedTariffItem[];
}

/// connector types
export interface Connector {
    Id: string;
    EvseUid: string;
    Standard: string;
    Format: string;
    PowerType: string;
    MaxVoltage: number;
    MaxAmperage: number;
    MaxElectricPower: number;
    TermsAndConditions: string | null;
    TariffId: string;
    LastUpdated: string;
    PricePerKwh: number;
    ConnectionFee: number;
    ParkingFee: number;
    TariffDetails: TariffDetails;
}

export interface ParsedConnectorData {
    id: string;
    standard: string;
    format: string;
    power_type: string;
    max_voltage: number;
    max_amperage: number;
    max_electric_power: number;
    last_updated: Timestamp;
    tariff_id: string;
    price_per_kwh?: number;
    connection_fee?: number;
    parking_fee?: number;
    tariff_details?: ParsedTariffDetails;
}

export type OcpiConnector = Omit<Connector, "PricePerKwh" | "ConnectionFee" | "ParkingFee" | "TariffDetails">;

/// evse types
export type EvseStatus = "AVAILABLE" | "CHARGING" | "BLOCKED";

export interface Evse {
    Uid: string;
    LocationId: string;
    EvseId: string;
    Status: EvseStatus;
    FloorLevel: string | null;
    Latitude: number;
    Longitude: number;
    PhysicalReference: string | null;
    Directions: string | null;
    ParkingRestrictions: string | null;
    Images: string | null;
    Capabilities: string;
    LastUpdated: string;
    Connectors: Connector[];
    Description: string[];
}

export interface ParsedEvseData {
    uid: string;
    status: EvseStatus;
    floor_level: string | null;
    physical_reference: string | null;
    last_updated: Timestamp;
    connectors: ParsedConnectorData[];
}

export interface OcpiEvse extends Omit<Evse, "Connectors" | "Description" | "Capabilities"> {
    OcpiConnectors: OcpiConnector[];
}

/// location types
export interface Location {
    Id: string;
    OwnerCountryCode: string;
    OwnerPartyId: string;
    Publish: boolean;
    Name: string;
    Address: string;
    City: string;
    State: string;
    Country: string;
    OperatorName: string;
    OwnerName: string;
    Latitude: number;
    Longitude: number;
    Facilities: string | null;
    OpeningTimes: string;
    ParkingType: string;
    Images: string | null;
    LastUpdated: string;
}

export interface OcpiLocation extends Location {
    PostalCode: string;
    Type: string | null;
    RelatedLocations: string | null;
    EnergyMix: string | null;
    PartyId: string;
    CountryCode: string;
    CompanyName: string;
    OcpiEvses: OcpiEvse[];
}

export interface ParsedLocationData {
    name: string;
    id: string;
    country: string;
    address: string;
    lat: number;
    lng: number;
    image?: string | null;
}

export interface ParsedOcpiLocationData extends ParsedLocationData {
    company_name: string;
    party_id: string;
    stations: ParsedEvseData[];
}
