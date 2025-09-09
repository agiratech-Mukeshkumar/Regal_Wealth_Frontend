export interface User {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
    is_2fa_enabled: boolean;
    mobile_number:string

}

// types.ts
// src/types.ts
export type SectionKey = 'assets' | 'liabilities' | 'investor_profile' | string;

export type InputType = 'checkbox' | 'multiple_choice' | 'textbox' | 'number';

export interface FormOption {
  id?: number;
  question_id?: number;
  label: string;
  option_order?: number;
}

export interface FormQuestion {
  id?: number;
  section: SectionKey;
  label: string;
  input_type: InputType;
  placeholder?: string;
  is_active?: boolean;
  display_order?: number;
  options?: FormOption[];
}
