import './PageCard.css';

function PageCard({ page, onDelete }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <article className="page-card animate-slide-up">
            <div className="page-card-header">
                <h3 className="page-card-title">{page.page_name}</h3>
                <span className="badge badge-active">Active</span>
            </div>

            <div className="page-card-body">
                <div className="page-info">
                    <div className="page-info-item">
                        <span className="page-info-label">Page ID:</span>
                        <code className="page-info-value">{page.page_id}</code>
                    </div>
                    <div className="page-info-item">
                        <span className="page-info-label">Added on:</span>
                        <span className="page-info-value">{formatDate(page.created_at)}</span>
                    </div>
                </div>
            </div>

            <div className="page-card-footer">
                <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(page.id, page.page_name)}
                >
                    <i className="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </article>
    );
}

export default PageCard;
