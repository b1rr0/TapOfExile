export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateAllocations(classId: string, level: number, allocated: number[]): ValidationResult;
