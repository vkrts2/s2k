import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SaleModal } from './sale-modal';
import type { Currency } from '@/lib/types';

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
      currency: 'TRY' as Currency,
    },
    setFormValues: jest.fn(),
    availableStockItems: [],
  };

  it('başlık ve form elemanlarını ekranda gösterir', () => {
    render(<SaleModal {...defaultProps} />);
    expect(screen.getByText('Satış Ekle')).toBeInTheDocument();
    expect(screen.getByLabelText('Stok Kalemi')).toBeInTheDocument();
    expect(screen.getByLabelText('Miktar')).toBeInTheDocument();
    expect(screen.getByLabelText('Birim Fiyat')).toBeInTheDocument();
    expect(screen.getByLabelText('Tutar')).toBeInTheDocument();
    expect(screen.getByLabelText('Tarih')).toBeInTheDocument();
    expect(screen.getByLabelText('Açıklama')).toBeInTheDocument();
  });
}); 