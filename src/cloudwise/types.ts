import { TObject } from "akeyless-types-commons";

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
interface TariffDetails {
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

interface Connector {
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

interface Evse {
    Uid: string;
    LocationId: string;
    EvseId: string;
    Status: string;
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

interface Location {
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
    Images: string;
    LastUpdated: string;
}

interface OcpiConnector extends Omit<Connector, "PricePerKwh" | "ConnectionFee" | "ParkingFee" | "TariffDetails"> {}

interface OcpiEvse extends Omit<Evse, "Connectors" | "Description" | "Capabilities"> {
    OcpiConnectors: OcpiConnector[];
}

interface OcpiLocation extends Location {
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
    /// TODO: add response
}

/// get command status
export interface GetCommandStatusOptions {}

export interface GetCommandStatusResponse extends CloudwiseResponse {
    CommandStatus: string;
    Status: string;
    KWh: string;
    StartTime: number;
}

// user cdrs
export interface UserCdrsOptions {}

export interface UserCdrsResponse extends CloudwiseResponse {
    /// TODO: add response
}
