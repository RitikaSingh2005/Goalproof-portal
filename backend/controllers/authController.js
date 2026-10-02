import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { JWT_SECRET } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, manager_id } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse(res, 400, 'User already exists', 'USER_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        department: department || null,
        manager_id: manager_id ? parseInt(manager_id, 10) : null,
      }
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'register',
        user_id: user.id,
        details: `User registered with role ${user.role}`,
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };

    return successResponse(res, 201, 'User registered successfully', { user: safeUser, token }, { user: safeUser, token });
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'login',
        user_id: user.id,
        details: 'User logged in',
      }
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };

    return successResponse(res, 200, 'Login successful', { user: safeUser, token }, { user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        manager_id: true,
      }
    });

    if (!user) {
      return errorResponse(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    return successResponse(res, 200, 'User profile fetched successfully', { user }, { user });
  } catch (error) {
    console.error('GetMe error:', error);
    return errorResponse(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};
