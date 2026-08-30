import { getDoctorByIndex, getProductByIndex, getHealthRecordByIndex } from '../../services/mockData';

describe('mockData Caching', () => {
  it('should reuse and return the identical object instance for repeated calls on the same index (Doctor)', () => {
    const doc1 = getDoctorByIndex(5);
    const doc2 = getDoctorByIndex(5);
    const doc3 = getDoctorByIndex(6);

    expect(doc1).toBe(doc2);
    expect(doc1).toEqual(doc2);
    expect(doc1).not.toBe(doc3);
  });

  it('should reuse and return the identical object instance for repeated calls on the same index (Product)', () => {
    const prod1 = getProductByIndex(42);
    const prod2 = getProductByIndex(42);
    const prod3 = getProductByIndex(43);

    expect(prod1).toBe(prod2);
    expect(prod1).toEqual(prod2);
    expect(prod1).not.toBe(prod3);
  });

  it('should reuse and return the identical object instance for repeated calls on the same index (HealthRecord)', () => {
    const rec1 = getHealthRecordByIndex(100);
    const rec2 = getHealthRecordByIndex(100);
    const rec3 = getHealthRecordByIndex(101);

    expect(rec1).toBe(rec2);
    expect(rec1).toEqual(rec2);
    expect(rec1).not.toBe(rec3);
  });
});