import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const BillOfLadingTable = () => {
  const [billOfLadingData, setBillOfLadingData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/billoflading')
      .then(res => res.json())
      .then(data => setBillOfLadingData(data))
      .catch(err => console.error('Error fetching bill of lading:', err));
  }, []);

  return (
    <div>
      <h2>Bill of Lading</h2>
      <table>
        <thead>
          <tr>
            <th>BOL ID</th>
            <th>Type of B/L</th>
            <th>Shipper</th>
            <th>Consignee</th>
            <th>B/L No.</th>
            <th>Forwarder</th>
            <th>Container No.</th>
            <th>Container Type</th>
            <th>Quantity</th>
            <th>Gross Weight</th>
            <th>Port of Loading</th>
            <th>Port of Discharge</th>
            <th>ETA</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {billOfLadingData.map((row, index) => (
            <tr key={index}>
              <td>{row.bol_id}</td>
              <td>{row.typeofbl}</td>
              <td>{row.shipper}</td>
              <td>{row.consignee}</td>
              <td>{row.blno}</td>
              <td>{row.forwarder}</td>
              <td>{row.containerno}</td>
              <td>{row.containertype}</td>
              <td>{row.quantity}</td>
              <td>{row.grossweight}</td>
              <td>{row.portofloading}</td>
              <td>{row.portofdischarge}</td>
              <td>{row.eta}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BillOfLadingTable;