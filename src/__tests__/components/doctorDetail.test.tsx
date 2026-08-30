import React from 'react';
import { Pressable } from 'react-native';
import { DoctorDetail } from '../../features/consultation/components/DoctorDetail';
import { timeProvider } from '../../services/timeProvider';
import { Doctor } from '../../types/domain';

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => React.createElement(View, props);
});

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CalendarDays: (props: any) => React.createElement(View, props),
  };
});

// Mock Themes
jest.mock('../../hooks/use-theme', () => ({
  useTheme: () => ({
    backgroundElement: '#F0F0F3',
    text: '#000000',
    backgroundSelected: '#E0E0E0',
  }),
}));

// Mock React Hooks directly to run component as a pure function
let mockHookCallCount = 0;
let mockShowDatePicker = false;
const mockSetShowDatePicker = jest.fn();

jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    useState: (init: any) => {
      mockHookCallCount++;
      return [mockShowDatePicker, mockSetShowDatePicker];
    },
    useEffect: jest.fn(),
  };
});

describe('DoctorDetail Expiry Rendering', () => {
  const doctor: Doctor = {
    id: 'doc-1',
    name: 'Dr. John Watson',
    specialty: 'Cardiology',
    rating: 4.8,
    experience: 12,
    consultationFee: 500,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    imageUrl: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockHookCallCount = 0;
    mockShowDatePicker = false;
  });

  afterEach(() => {
    timeProvider.setCustomNowFn(null);
  });

  it('renders expired and future slots correctly based on timeProvider', () => {
    // Inject deterministic current time: Aug 30, 2026 at 11:30 AM
    timeProvider.setCustomNowFn(() => new Date(2026, 7, 30, 11, 30));

    // Slots: 10:00 AM (expired), 12:00 PM (future)
    const slots = [
      { time: '10:00 AM', isAvailable: true },
      { time: '12:00 PM', isAvailable: true },
    ];

    const onBookMock = jest.fn();

    const element = DoctorDetail({
      doctor,
      selectedDate: '2026-08-30',
      setSelectedDate: jest.fn(),
      slots,
      loadingSlots: false,
      slotsError: null,
      onBack: jest.fn(),
      onBook: onBookMock,
      bookingQueue: [],
      bookingMessage: null,
    });

    // Helper to recursively find slot rows, Pressables, and labels
    function findSlotButtonsAndLabels(node: any): { time: string; disabled: boolean; label: string; role: string; aLabel: string; aState: any }[] {
      if (!node) return [];
      let list: any[] = [];

      if (node.type && node.props && node.props.children) {
        const children = React.Children.toArray(node.props.children);
        // Find if this node has a row layout and fits the slotTimeText / bookButton layout
        const hasTimeTextChild = children.some((c: any) => c && c.props && c.props.style && String(c.props.style).includes('slotTimeText') || (c.props && typeof c.props.children === 'string' && c.props.children.includes(':00')));
        const pressableChild = children.find((c: any) => c && c.type === Pressable) as any;
        if (hasTimeTextChild && pressableChild) {
          const timeTextChild = children.find((c: any) => c && typeof c.props?.children === 'string' && c.props.children.includes(':00')) as any;
          const time = timeTextChild ? timeTextChild.props.children : '';
          const disabled = pressableChild.props.disabled;
          const textNode = React.Children.toArray(pressableChild.props.children)[0] as any;
          const label = textNode ? textNode.props.children : '';
          const role = pressableChild.props.accessibilityRole;
          const aLabel = pressableChild.props.accessibilityLabel;
          const aState = pressableChild.props.accessibilityState;
          list.push({ time, disabled, label, role, aLabel, aState });
        }
      }

      if (node.props && node.props.children) {
        React.Children.forEach(node.props.children, child => {
          list = list.concat(findSlotButtonsAndLabels(child));
        });
      }
      return list;
    }

    const testSlots = findSlotButtonsAndLabels(element);
    expect(testSlots).toHaveLength(2);

    // Verify 10:00 AM slot is Expired
    const expiredSlot = testSlots.find(s => s.time === '10:00 AM');
    expect(expiredSlot).toBeDefined();
    expect(expiredSlot!.label).toBe('Expired');
    expect(expiredSlot!.disabled).toBe(true);
    expect(expiredSlot!.role).toBe('button');
    expect(expiredSlot!.aLabel).toBe('10:00 AM slot on 2026-08-30 is expired');
    expect(expiredSlot!.aState).toEqual({ disabled: true });

    // Verify 12:00 PM slot is Bookable
    const futureSlot = testSlots.find(s => s.time === '12:00 PM');
    expect(futureSlot).toBeDefined();
    expect(futureSlot!.label).toBe('Book');
    expect(futureSlot!.disabled).toBe(false);
    expect(futureSlot!.role).toBe('button');
    expect(futureSlot!.aLabel).toBe('12:00 PM slot on 2026-08-30 is available');
    expect(futureSlot!.aState).toEqual({ disabled: false });
  });
});
