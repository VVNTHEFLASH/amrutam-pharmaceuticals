import { classifyAttachment } from '../../features/records/utils/attachmentUtils';

describe('Attachment File Classification', () => {
  it('should classify images correctly based on common formats', () => {
    expect(classifyAttachment('https://example.com/attachments/rec-1.png')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-2.jpg')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-3.jpeg')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-4.webp')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-5.gif')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-6.PNG')).toBe('image');
  });

  it('should classify PDFs correctly', () => {
    expect(classifyAttachment('https://example.com/attachments/rec-7.pdf')).toBe('pdf');
    expect(classifyAttachment('https://example.com/attachments/rec-8.PDF')).toBe('pdf');
  });

  it('should return unsupported for other formats', () => {
    expect(classifyAttachment('https://example.com/attachments/rec-9.txt')).toBe('unsupported');
    expect(classifyAttachment('https://example.com/attachments/rec-10.docx')).toBe('unsupported');
    expect(classifyAttachment('https://example.com/attachments/rec-11.zip')).toBe('unsupported');
    expect(classifyAttachment('')).toBe('unsupported');
  });

  it('should ignore query parameters when identifying formats', () => {
    expect(classifyAttachment('https://example.com/attachments/rec-12.jpg?token=abcd')).toBe('image');
    expect(classifyAttachment('https://example.com/attachments/rec-13.pdf?userId=123')).toBe('pdf');
  });
});
