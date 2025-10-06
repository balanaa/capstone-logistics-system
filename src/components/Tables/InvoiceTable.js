import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const InvoiceTable = () => {
  const [invoiceData, setInvoiceData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/invoice')
      .then(res => res.json())
      .then(data => setInvoiceData(data))
      .catch(err => console.error('Error fetching invoice:', err));
  }, []);

  return (
    <div>
      <h2>Invoices</h2>
      <table>
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Invoice No</th>
            <th>Invoice Date</th>
            <th>Invoice Amount</th>
            <th>Incoterms</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {invoiceData.map((row, index) => (
            <tr key={index}>
              <td>{row.invoiceid}</td>
              <td>{row.invoiceno}</td>
              <td>{row.invoicedate}</td>
              <td>{row.invoiceamount}</td>
              <td>{row.incoterms}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;