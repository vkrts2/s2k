import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SaleModal } from './sale-modal';

describe('SaleModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    formValues: {
      stockItemId: '',
      quantity: '',
      unitPrice: '',
      amount: '',
      date: undefined,
      dateInput: '',
      description: '',
      currency: 'TRY',
    },
    setFormValues: jest.fn(),
    availableStockItems: [],
  };

  it('başlangıçta tür seçimi ekranını gösterir', () => {
    render(<SaleModal {...defaultProps} />);
    expect(screen.getByText('Satış Türü Seçin')).toBeInTheDocument();
    expect(screen.getByText('Manuel Satış')).toBeInTheDocument();
    expect(screen.getByText('Faturalı Satış')).toBeInTheDocument();
  });
}); 