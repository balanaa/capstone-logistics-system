import React, { useEffect, useState } from 'react';

function TableComponent({ title, endpoint }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/${endpoint}`)
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.error('Fetch error:', err));
  }, [endpoint]);

  if (data.length === 0) return <p>Loading {title}...</p>;

  return (
    <div>
      <h2>{title}</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            {Object.keys(data[0]).map(key => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              {Object.values(row).map((val, i) => (
                <td key={i}>{val !== null ? val.toString() : ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableComponent;
