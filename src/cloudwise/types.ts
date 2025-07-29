import { TObject } from "akeyless-types-commons";
import type { Timestamp } from "firebase-admin/firestore";

/// commons
export type CloudwiseConfig =
    | {
          base_url: string;
          email: string;
          password: string;
          login_key: string;
          token: string;
      }
    | TObject<string>;

export interface CloudwiseResponse {
    ErrorCode: number;
    ErrorMessage: string;
    ErrorProvider: number;
    Count: number;
    RequestID: string;
    ServerTime: string;
}

/// helpers
export interface TariffDetails {
    PricePerKwh: number;
    ConnectionFee: number;
    ParkingFee: number | null;
    Currency: string;
    TariffItems: {
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
    }[];
    ErrorMessage: string | null;
    ErrorCode: number;
}

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

type EvseStatus = "AVAILABLE" | "CHARGING" | "BLOCKED";

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

export interface OcpiConnector extends Omit<Connector, "PricePerKwh" | "ConnectionFee" | "ParkingFee" | "TariffDetails"> {}

export interface OcpiEvse extends Omit<Evse, "Connectors" | "Description" | "Capabilities"> {
    OcpiConnectors: OcpiConnector[];
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

/// get locations
export interface GetLocationsOptions {
    lat?: number;
    lng?: number;
    radius?: number;
    limit?: number;
    offset?: number;
    time_zone?: number;
}

export interface GetLocationsResponse extends CloudwiseResponse {
    Items: OcpiLocation[];
}

/// get location details
export interface GetLocationDetailsOptions {
    party_id?: string;
    country_code?: string;
}

export interface GetLocationDetailsResponse extends CloudwiseResponse {
    Location: {
        Location: Location;
        Evses: Evse[];
        ErrorMessage: string | null;
        ErrorCode: number;
    };
}

/// send command
export interface SendCommandOptions {
    command: "START_SESSION" | "STOP_SESSION";
    location_id: string;
    party_id: string;
    evse_uid: string;
    connector_id: string;
    ble_id: string;
    device_id: string;
    asset_id: string;
    ignore_distance_check?: boolean;
    command_id?: string;
    lat?: number;
    lng?: number;
    country_code?: string;
}

export interface SendCommandResponse extends CloudwiseResponse {
    CommandId: string;
}

/// get command status
export interface GetCommandStatusOptions {
    command_id: string;
    asset_id: string;
    ble_id: string;
    device_id: string;
}

export interface GetCommandStatusResponse extends CloudwiseResponse {
    CommandStatus: string;
    Status: string;
    KWh: string;
    Cost: string;
    ChargingTimeInSeconds: string;
}

// user cdrs
export interface UserCdrsOptions {
    asset_id: string;
    offset?: number;
    limit?: number;
    time_zone?: number;
}

interface OcpiCdr {
    ocpCountryCode: string;
    ocpPartyId: string;
    id: string;
    startDateTime: string;
    endDateTime: string;
    sessionId: string;
    authMethod: string;
    authorizationReference: string;
    currency: string;
    totalCost: number;
    totalCostWithVat: number;
    totalCostExcVat: number;
    totalFixCost: number;
    totalFixCostWithVat: number;
    totalEnergy: number;
    totalEnergyCost: number;
    totalEnergyCostWithVat: number;
    totalTime: number;
    totalTimeCost: number;
    totalTimeCostWithVat: number;
    totalParkingTime: number;
    totalParkingCost: number;
    totalParkingCostWithVat: number;
    totalReservationCost: number;
    totalReservationCostWithVat: number;
    cdrTokenCountryCode: string;
    cdrTokenPartyId: string;
    cdrTokenUid: string;
    cdrTokenType: string;
    cdrTokenContractId: string;
    invoiceReferenceId: string;
    creditsBalance: number;
    creditsExpirationDate: string;
    credit: boolean;
    creditReferenceId: string;
    homeCharging: boolean;
    lastUpdated: string;
    avgKwhPrice: number;
    duration: number;
}
export interface UserCdrsResponse extends CloudwiseResponse {
    Items: OcpiCdr[];
}

/// parsed location helpers
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
}

export interface ParsedEvseData {
    uid: string;
    status: EvseStatus;
    floor_level: string | null;
    physical_reference: string | null;
    last_updated: Timestamp;
    connectors: ParsedConnectorData[];
}

export interface ParsedLocationData {
    name: string;
    id: string;
    country: string;
    address: string;
    company_name: string;
    party_id: string;
    lat: number;
    lng: number;
    image?: string | null;
    stations: ParsedEvseData[];
}
