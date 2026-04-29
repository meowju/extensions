import users from '../config/database.js';

export const getAllUsers = (req, res) => {
  try {
    const allUsers = users.findAll();
    res.json({ users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = (req, res) => {
  try {
    const { id } = req.params;

    const user = users.findById(parseInt(id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export default { getAllUsers, getUserById };