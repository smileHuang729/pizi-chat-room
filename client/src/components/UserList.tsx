import { User } from '../types';

interface UserListProps {
    users: User[];
    currentUserId: string;
}

export default function UserList({ users, currentUserId }: UserListProps) {
    return (
        <div className="user-list-panel">
            <div className="user-list-header">
                <span className="user-list-count">
                    <span style={{ color: 'var(--online)' }}>●</span>
                    &nbsp;在线成员 — {users.length}
                </span>
            </div>
            <div className="user-list-scroll">
                {users.map((user) => (
                    <div key={user.id} className="user-item">
                        <div className="user-item-avatar-wrap">
                            <div
                                className="user-item-avatar"
                                style={{ background: user.avatar }}
                                title={user.username}
                            />
                            <span className="user-item-online-dot" />
                        </div>
                        <span className={`user-item-name ${user.id === currentUserId ? 'me' : ''}`}>
                            {user.username}
                            {user.id === currentUserId && ' (我)'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
