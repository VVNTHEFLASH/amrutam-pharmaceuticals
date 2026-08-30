import { useToastStore } from '../../store/toastStore';

describe('useToastStore State Machine', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('should start with an empty toasts list', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('should add a success toast correctly', () => {
    useToastStore.getState().showToast('success', 'Logged in successfully', 'Welcome');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].description).toBe('Logged in successfully');
    expect(toasts[0].title).toBe('Welcome');
    expect(toasts[0].id).toBeDefined();
  });

  it('should automatically dismiss after timeout', () => {
    jest.useFakeTimers();
    useToastStore.getState().showToast('info', 'Operation in progress');
    expect(useToastStore.getState().toasts).toHaveLength(1);

    // Fast-forward 3000ms
    jest.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    jest.useRealTimers();
  });

  it('should dismiss manually when calling dismissToast', () => {
    useToastStore.getState().showToast('error', 'Something went wrong');
    const startToasts = useToastStore.getState().toasts;
    expect(startToasts).toHaveLength(1);

    const toastId = startToasts[0].id;
    useToastStore.getState().dismissToast(toastId);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should enforce toast limit and cap stacking to prevent overcrowding', () => {
    useToastStore.getState().showToast('info', 'First toast');
    useToastStore.getState().showToast('success', 'Second toast');
    useToastStore.getState().showToast('error', 'Third toast');

    const totalToasts = useToastStore.getState().toasts;
    // Capped at 2 toasts maximum
    expect(totalToasts.length).toBeLessThanOrEqual(2);
    // The last two toasts should remain
    expect(totalToasts[0].description).toBe('Second toast');
    expect(totalToasts[1].description).toBe('Third toast');
  });
});
