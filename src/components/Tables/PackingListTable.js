import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const PackingListTable = () => {
  const [packingListData, setPackingListData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/packinglist')
      .then(res => res.json())
      .then(data => setPackingListData(data))
      .catch(err => console.error('Error fetching packing list:', err));
  }, []);

  return (
    <div>
      <h2>Packing Lists</h2>
      <table>
        <thead>
          <tr>
            <th>Packing List ID</th>
            <th>Quantity</th>
            <th>Net Weight</th>
            <th>Gross Weight</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {packingListData.map((row, index) => (
            <tr key={index}>
              <td>{row.packinglistid}</td>
              <td>{row.quantity}</td>
              <td>{row.netweight}</td>
              <td>{row.grossweight}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PackingListTable;
