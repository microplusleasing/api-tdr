export interface TdrAssessmentRequest {
  customerInformation: CustomerInformation;
  productInformation: ProductInformation;
  estimateIncome: EstimateIncome;
  estimatePayment: EstimatePayment;
  restructureReason: RestructureReason;
  documentAttachments: DocumentAttachments;
}

export interface CustomerInformation {
  contractNo: string;
  title: string;
  firstName: string;
  lastName: string;
  citizenId: string;

  idCardAddress: Address;
  registeredAddressSameAsIdCard: boolean;
  registeredAddress: Address;

  currentAddressSameAsIdCard: boolean;
  currentAddress: Address;

  phoneNo: string;
  maritalStatus: string;
  numberOfChildren: string;
  dependents: string;

  occupation: string;
  position: string;
  jobDescription: string;
  workplaceName: string;

  workplaceAddress: WorkplaceAddress;

  reference1: ReferencePerson;
  reference2: ReferencePerson;
}

export interface Address {
  postalCodeLookup: string;
  houseNo: string;
  alley: string;
  soi: string;
  road: string;
  postalCode: string;
  subDistrict: string;
  district: string;
  province: string;
}

export interface WorkplaceAddress extends Address {
  workplacePhone: string;
  workplaceDescription: string;
}

export interface ReferencePerson {
  name: string;
  phone: string;
  relationship: string;
}

export interface ProductInformation {
  brand: string;
  model: string;
  color: string;
  registrationNo: string;

  vehicleUserType: string;
  additionalInfo: string;

  currentUserName: string;
  relationship: string;
  currentUserPhone: string;

  currentCondition: string;
  carUserAddress: VehicleUserAddress;

  currentMileage: string;

  motorcyclePhoto: MotorcyclePhoto[];
}

export interface VehicleUserAddress {
  postalCodeLookup: string;
  postalCode: string;
  subDistrict: string;
  district: string;
  province: string;
}

export interface MotorcyclePhoto {
  photoType: string;
  file: unknown;
  fileName: string;
}

export interface EstimateIncome {
  incomes: Record<string, IncomeDetail>;
}

export interface IncomeDetail {
  amount: number;
  remark: string | null;
}

export interface EstimatePayment {
  [groupCode: string]: Record<string, PaymentDetail>;
}

export interface PaymentDetail {
  itemId: number;
  amount: number;
  remark: string | null;
}

export interface RestructureReason {
  reasons: RestructureReasonDetail[];
}

export interface RestructureReasonDetail {
  reasonCode: string;
  selected: boolean;
  otherReason: string;
}

export interface DocumentAttachments {
  attachments: Attachment[];
}

export interface Attachment {
  attachmentCode: string;
  files: AttachmentFile[] | null;
}

export interface AttachmentFile {
  file: unknown;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileExt?: string;
  filePath?: string;
  remark?: string;
}
