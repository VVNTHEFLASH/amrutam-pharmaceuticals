import React, { act } from 'react';
import renderer from 'react-test-renderer';
import DoctorsScreen from '../../app/doctors';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Search: (props: any) => React.createElement(View, props),
    ChevronLeft: (props: any) => React.createElement(View, props),
    ChevronRight: (props: any) => React.createElement(View, props),
  };
});

jest.mock('../../hooks/use-theme', () => ({
  useTheme: () => ({
    backgroundElement: '#F0F0F3',
    text: '#000000',
    backgroundSelected: '#E0E0E0',
    textSecondary: '#666666',
  }),
}));

const mockStoreState = { bookingQueue: [] };
jest.mock('../../store/clientStore', () => {
  const useStore = (selector: any) => selector(mockStoreState);
  useStore.getState = () => mockStoreState;
  return { useClientStore: useStore };
});

const mockToastState = { showToast: jest.fn() };
jest.mock('../../store/toastStore', () => {
  const useStore = (selector: any) => selector(mockToastState);
  useStore.getState = () => mockToastState;
  return { useToastStore: useStore };
});

const mockConsultationHook = {
  doctors: [
    {
      id: 'doc-1',
      name: 'Dr. Aarav',
      specialty: 'Ayurvedic Specialist',
      imageUrl: 'http://example.com/aarav.jpg',
      rating: 4.8,
      experience: 10,
      consultationFee: 500,
      availableDays: ['Monday']
    }
  ],
  loading: false,
  error: null as string | null,
  page: 1,
  totalPages: 1,
  totalCount: 1,
  search: '',
  specialty: '',
  sort: 'rating_desc',
  availability: '',
  selectedDoctor: null as any,
  selectedDate: '2026-08-30',
  slots: [],
  loadingSlots: false,
  slotsError: null,
  setSelectedDoctor: jest.fn(),
  setSelectedDate: jest.fn(),
  bookSlot: jest.fn(),
  setFilters: jest.fn(),
  retryDoctors: jest.fn(),
};

jest.mock('../../features/consultation/hooks/useConsultation', () => ({
  useConsultation: () => mockConsultationHook,
}));

describe('DoctorsScreen Frontend Refinements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsultationHook.sort = 'rating_desc';
    mockConsultationHook.specialty = '';
    mockConsultationHook.availability = '';
    mockConsultationHook.setFilters.mockReset();
  });

  it('renders rating above book and handles sort labels/highlights status', async () => {
    let component: any;
    await act(async () => {
      component = renderer.create(<DoctorsScreen />);
    });
    const root = component.root;

    // Doctor details and rating
    expect(root.findByProps({ children: 'Dr. Aarav' })).toBeDefined();
    const ratingText = root.findByProps({ accessibilityLabel: 'Rating: 4.8 stars' });
    expect(ratingText.props.style).toEqual(
      expect.objectContaining({ color: '#FFA800', fontWeight: '600' })
    );

    // Initial Button labels
    expect(root.findByProps({ accessibilityLabel: 'Sort by name' }).findByProps({ type: 'small' }).props.children).toBe('A-Z');
    expect(root.findByProps({ accessibilityLabel: 'Sort by fee' }).findByProps({ type: 'small' }).props.children).toBe('Fee');
  });

  it('toggles name sort toggles A-Z/Z-A dynamically', async () => {
    let component: any;
    await act(async () => {
      component = renderer.create(<DoctorsScreen />);
    });
    const root = component.root;

    await act(async () => {
      root.findByProps({ accessibilityLabel: 'Sort by name' }).props.onPress();
    });
    expect(mockConsultationHook.setFilters).toHaveBeenCalledWith({ sort: 'name_asc', page: 1 });

    // When name_asc is active
    mockConsultationHook.sort = 'name_asc';
    let c2: any;
    await act(async () => {
      c2 = renderer.create(<DoctorsScreen />);
    });
    const nameText2 = c2.root.findByProps({ accessibilityLabel: 'Sort by name' }).findByProps({ type: 'small' });
    expect(nameText2.props.children).toBe('A-Z');
    expect(nameText2.props.style.color).toBe('#ffffff');

    await act(async () => {
      c2.root.findByProps({ accessibilityLabel: 'Sort by name' }).props.onPress();
    });
    expect(mockConsultationHook.setFilters).toHaveBeenLastCalledWith({ sort: 'name_desc', page: 1 });
  });

  it('toggles fee sort triggers', async () => {
    let component: any;
    await act(async () => {
      component = renderer.create(<DoctorsScreen />);
    });
    await act(async () => {
      component.root.findByProps({ accessibilityLabel: 'Sort by fee' }).props.onPress();
    });
    expect(mockConsultationHook.setFilters).toHaveBeenLastCalledWith({ sort: 'fee_asc', page: 1 });

    mockConsultationHook.sort = 'fee_asc';
    let c2: any;
    await act(async () => {
      c2 = renderer.create(<DoctorsScreen />);
    });
    const feeText2 = c2.root.findByProps({ accessibilityLabel: 'Sort by fee' }).findByProps({ type: 'small' });
    expect(feeText2.props.children).toBe('Fee ↑');
    expect(feeText2.props.style.color).toBe('#ffffff');

    await act(async () => {
      c2.root.findByProps({ accessibilityLabel: 'Sort by fee' }).props.onPress();
    });
    expect(mockConsultationHook.setFilters).toHaveBeenLastCalledWith({ sort: 'fee_desc', page: 1 });
  });
});

