import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const BillingInvoicesTable = () => {
  const [billingInvoiceData, setBillingInvoiceData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/billinginvoices')
      .then(res => res.json())
      .then(data => setBillingInvoiceData(data))
      .catch(err => console.error('Error fetching billing invoices:', err));
  }, []);

  return (
    <div>
      <h2>Billing Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice No</th>
            <th>Payor</th>
            <th>Amount</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {billingInvoiceData.map((row, index) => (
            <tr key={index}>
              <td>{row.invoiceno}</td>
              <td>{row.payor}</td>
              <td>{row.amount}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillingInvoicesTable;
