import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const DeliveryOrderTable = () => {
  const [deliveryOrderData, setDeliveryOrderData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/deliveryorder')
      .then(res => res.json())
      .then(data => setDeliveryOrderData(data))
      .catch(err => console.error('Error fetching delivery order:', err));
  }, []);

  return (
    <div>
      <h2>Delivery Orders</h2>
      <table>
        <thead>
          <tr>
            <th>Delivery Order ID</th>
            <th>Free Until</th>
            <th>Return Yard</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {deliveryOrderData.map((row, index) => (
            <tr key={index}>
              <td>{row.deliveryorderid}</td>
              <td>{row.freeuntil}</td>
              <td>{row.returnyard}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryOrderTable;
