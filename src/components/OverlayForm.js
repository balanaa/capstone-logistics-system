import React, { useState } from 'react';
import './Overlay.css';

const OverlayForm = ({ type, data, onClose, onSubmit }) => {
    const [formData, setFormData] = useState(() =>
        Object.fromEntries(data.map(item => [item.label, item.info ?? '']))
    );

    const handleChange = (label, value) => {
        setFormData(prev => ({ ...prev, [label]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="overlay-background" onClick={onClose}>
            <div className="overlay-form" onClick={(e) => e.stopPropagation()}>
                <h2>Edit {type}</h2>
                <form onSubmit={handleSubmit}>
                    {Object.entries(formData).map(([label, value]) => (
                        <div key={label} className="form-group">
                            <label>{label}</label>
                            <input
                                type="text"
                                value={value}
                                onChange={e => handleChange(label, e.target.value)}
                            />
                        </div>
                    ))}
                    <button type="submit" className="save-button">Save</button>
                </form>
            </div>
        </div>
    );
};

export default OverlayForm;
