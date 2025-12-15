import './RulesTable.css';

function RulesTable({ rules, onDeleteRule }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (rules.length === 0) {
        return (
            <div className="table-card">
                <table className="rules-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Keyword</th>
                            <th>Reply</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan="5" className="no-data">
                                No rules found. Add a new rule!
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="table-card animate-fade-in">
            <table className="rules-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Keyword</th>
                        <th>Reply</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rules.map((rule, index) => (
                        <tr key={rule.id}>
                            <td>{index + 1}</td>
                            <td><strong>{rule.keyword}</strong></td>
                            <td className="reply-cell">{rule.reply}</td>
                            <td>{formatDate(rule.created_at)}</td>
                            <td>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => onDeleteRule(rule.id, rule.keyword)}
                                >
                                    <i className="fa-solid fa-trash"></i> Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default RulesTable;
