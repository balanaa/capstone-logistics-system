import React, { useMemo, useState } from 'react';
import './OverlayForm.css';

// Props:
// - type: string (document type / title suffix)
// - data: [{ label, info }] dynamic field pairs to render
// - onClose: () => void
// - onSubmit: (formData) => void
// - fileUrl?: string (signed or public URL to preview)
// - fileName?: string (used to infer extension and display name)
const OverlayForm = ({ type, data, onClose, onSubmit, fileUrl, fileName }) => {
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

    const extension = useMemo(() => {
        const fromName = (fileName || '').split('.').pop()?.toLowerCase();
        if (fromName) return fromName;
        try {
            const u = new URL(fileUrl || '');
            const path = u.pathname || '';
            return path.split('.').pop()?.toLowerCase();
        } catch (_e) {
            return undefined;
        }
    }, [fileUrl, fileName]);

    const canEmbed = useMemo(() => {
        if (!extension) return false;
        return extension === 'pdf' || extension === 'png' || extension === 'jpg' || extension === 'jpeg';
    }, [extension]);

    return (
        <div className="overlay-background" onClick={onClose}>
            <div className="overlay-form" onClick={(e) => e.stopPropagation()}>
                <h2>Edit {type}</h2>
                <div className="overlay-body">
                    <div className="overlay-left">
                        {fileUrl ? (
                            canEmbed ? (
                                extension === 'pdf' ? (
                                    <iframe
                                        title={fileName || 'document-preview'}
                                        src={fileUrl}
                                        className="preview-frame"
                                    />
                                ) : (
                                    <img
                                        alt={fileName || 'document-preview'}
                                        src={fileUrl}
                                        className="preview-image"
                                    />
                                )
                            ) : (
                                <div className="preview-fallback">
                                    <div>No in-browser preview available for this file type.</div>
                                    <div>
                                        <a href={fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="preview-empty">No file preview available.</div>
                        )}
                    </div>
                    <div className="overlay-right">
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
            </div>
        </div>
    );
};

export default OverlayForm;
