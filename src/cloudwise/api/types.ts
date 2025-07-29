import { TObject } from "akeyless-types-commons";
import { Evse, Location, OcpiLocation } from "../types";

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
    party_id: string;
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
