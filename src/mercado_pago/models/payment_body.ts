import { Identification } from "./card_holder";

export interface PaymentBody {
    transaction_amount: number;
    token:              string;
    installments:       number;
    issuer_id:          string;
    payment_method_id:  string;
    payer:              Payer;
    order_id:           number;
}

export interface Payer {
    email:          string;
    identification: Identification;
}
