export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'GoalProof Portal REST API',
    version: '1.0.0',
    description: 'Production-ready REST API for GoalProof — employee goal setting, SMART evaluation, manager approvals, cycle-driven quarterly check-ins, and admin organization intelligence.'
  },
  servers: [
    {
      url: '/api',
      description: 'GoalProof Base API Endpoint'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT Bearer token obtained from /api/auth/login or /api/auth/register'
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API service health',
        responses: {
          200: {
            description: 'API is running',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, message: { type: 'string' } } } } }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user (employee, manager, or admin).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', format: 'email', example: 'jane.doe@company.com' },
                  password: { type: 'string', format: 'password', minLength: 6, example: 'password123' },
                  role: { type: 'string', enum: ['employee', 'manager', 'admin'], example: 'employee' },
                  department: { type: 'string', example: 'Engineering' },
                  manager_id: { type: 'integer', example: 2 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User successfully registered with JWT token' },
          400: { description: 'Validation failed or duplicate email' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate and receive JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'employee@goalproof.com' },
                  password: { type: 'string', format: 'password', example: 'password123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful with token and user object' },
          400: { description: 'Validation failed' },
          401: { description: 'Invalid email or password' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile retrieved' },
          401: { description: 'Token missing or invalid' }
        }
      }
    },
    '/goals': {
      get: {
        tags: ['Goals'],
        summary: 'Get current user goals',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of goals for current user' },
          401: { description: 'Unauthorized' }
        }
      },
      post: {
        tags: ['Goals'],
        summary: 'Create a new draft goal',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'thrust_area', 'uom_type', 'target_value', 'weightage'],
                properties: {
                  title: { type: 'string', example: 'Improve code quality coverage' },
                  thrust_area: { type: 'string', example: 'Engineering' },
                  description: { type: 'string', example: 'Increase test coverage to 85%' },
                  uom_type: { type: 'string', enum: ['Numeric', 'Percentage', 'Timeline'], example: 'Percentage' },
                  target_value: { type: 'number', example: 85 },
                  weightage: { type: 'integer', minimum: 10, maximum: 100, example: 25 },
                  smart_score: { type: 'integer', example: 80 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Goal created successfully' },
          400: { description: 'Validation failed, max goals reached, or invalid weightage' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/goals/{id}': {
      put: {
        tags: ['Goals'],
        summary: 'Update own draft/rejected goal',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  target_value: { type: 'number' },
                  weightage: { type: 'integer', minimum: 10, maximum: 100 },
                  thrust_area: { type: 'string' },
                  uom_type: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Goal updated' },
          400: { description: 'Invalid status or weightage' },
          403: { description: 'Cannot modify another user goal' },
          404: { description: 'Goal not found' }
        }
      },
      delete: {
        tags: ['Goals'],
        summary: 'Delete a draft or rejected goal',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Goal deleted successfully' },
          400: { description: 'Only draft or rejected goals can be deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'Goal not found' }
        }
      }
    },
    '/goals/submit-all': {
      post: {
        tags: ['Goals'],
        summary: 'Submit all draft/rejected goals for manager approval',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Goals submitted for approval' },
          400: { description: 'Total weightage must be exactly 100%, or goals under 10%' }
        }
      }
    },
    '/goals/shared': {
      get: {
        tags: ['Goals'],
        summary: 'Get shared organization goals assigned to user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of assigned shared goals' }
        }
      }
    },
    '/checkin/active': {
      get: {
        tags: ['Check-in'],
        summary: 'Get status of current performance cycle check-in window',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Active window info (isActive, quarter, year)' }
        }
      }
    },
    '/checkin': {
      post: {
        tags: ['Check-in'],
        summary: 'Submit a quarterly check-in for an approved goal',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['goal_id', 'actual_value'],
                properties: {
                  goal_id: { type: 'integer', example: 1 },
                  actual_value: { type: 'number', example: 75 },
                  status: { type: 'string', example: 'On Track' },
                  description: { type: 'string', example: 'Achieved 75% coverage so far' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Check-in submitted and achievement recorded' },
          400: { description: 'Invalid goal or goal is not approved' },
          403: { description: 'Check-in window is currently closed' }
        }
      }
    },
    '/checkin/history': {
      get: {
        tags: ['Check-in'],
        summary: 'Get user check-in and achievement history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of historical achievements and progress scores' }
        }
      }
    },
    '/manager/pending': {
      get: {
        tags: ['Manager'],
        summary: 'Get pending goals awaiting approval for manager team',
        security: [{ bearerAuth: [] }],
        description: 'Requires manager or admin role.',
        responses: {
          200: { description: 'Enriched list of pending goals with decay and mismatch flags' },
          403: { description: 'Forbidden: Insufficient permissions' }
        }
      }
    },
    '/manager/team': {
      get: {
        tags: ['Manager'],
        summary: 'Get manager team member analytics and progress',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Team stats and member goal progress' }
        }
      }
    },
    '/manager/attention-score': {
      get: {
        tags: ['Manager'],
        summary: 'Get manager attention score based on review responsiveness',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Score and action item details' }
        }
      }
    },
    '/manager/goals/{id}/approve': {
      put: {
        tags: ['Manager'],
        summary: 'Approve a team member goal',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Goal approved' },
          404: { description: 'Goal not found or unauthorized' }
        }
      }
    },
    '/manager/goals/{id}/reject': {
      put: {
        tags: ['Manager'],
        summary: 'Reject a team member goal with reason to edit',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Goal rejected' },
          404: { description: 'Goal not found or unauthorized' }
        }
      }
    },
    '/manager/goals/{id}/edit': {
      put: {
        tags: ['Manager'],
        summary: 'Manager edit a team member goal prior to approval',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  target_value: { type: 'number' },
                  weightage: { type: 'integer', minimum: 10, maximum: 100 },
                  thrust_area: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Goal edited by manager' },
          404: { description: 'Goal not found or unauthorized' }
        }
      }
    },
    '/manager/checkin/{employeeId}': {
      post: {
        tags: ['Manager'],
        summary: 'Add feedback comment on employee check-in',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'employeeId', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', example: 'Great progress this quarter!' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Comment added' }
        }
      }
    },
    '/admin/cycles': {
      get: {
        tags: ['Admin'],
        summary: 'List all performance cycles',
        security: [{ bearerAuth: [] }],
        description: 'Requires admin role.',
        responses: { 200: { description: 'List of performance cycles' } }
      },
      post: {
        tags: ['Admin'],
        summary: 'Create and activate a new performance cycle',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'start_date', 'end_date'],
                properties: {
                  name: { type: 'string', example: 'Q1 2026' },
                  start_date: { type: 'string', format: 'date', example: '2026-01-01' },
                  end_date: { type: 'string', format: 'date', example: '2026-03-31' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Cycle created and activated' },
          403: { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/admin/cycles/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update performance cycle dates or status',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Cycle updated' },
          404: { description: 'Cycle not found' }
        }
      }
    },
    '/admin/insights': {
      get: {
        tags: ['Admin'],
        summary: 'Organization-wide intelligence and analytics',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Org metrics, dept SMART scores, abandonment rates' }
        }
      }
    },
    '/admin/shared-analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Analytics on shared KPIs and employee distribution',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Shared KPI analytics' } }
      }
    },
    '/admin/audit-log': {
      get: {
        tags: ['Admin'],
        summary: 'View system audit logs',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Recent audit logs' } }
      }
    },
    '/admin/report': {
      get: {
        tags: ['Admin'],
        summary: 'Download organization goals CSV report',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'CSV file download',
            content: { 'text/csv': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    },
    '/admin/goals/{id}/unlock': {
      put: {
        tags: ['Admin'],
        summary: 'Emergency unlock of a goal with mandatory justification',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['justification'],
                properties: {
                  justification: { type: 'string', example: 'Scope change approved by VP' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Goal unlocked and reverted to draft for user editing' },
          400: { description: 'Justification missing' }
        }
      }
    },
    '/admin/employees': {
      get: {
        tags: ['Admin'],
        summary: 'Get all employees for assignment',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Employee list' } }
      }
    },
    '/admin/shared-goal': {
      post: {
        tags: ['Admin'],
        summary: 'Create and bulk-assign an organization-wide KPI',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'target_value', 'employeeIds'],
                properties: {
                  title: { type: 'string', example: 'Cybersecurity Annual Certification' },
                  description: { type: 'string' },
                  target_value: { type: 'number', example: 100 },
                  uom_type: { type: 'string', example: 'Percentage' },
                  thrust_area: { type: 'string', example: 'Compliance' },
                  employeeIds: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3] }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Master KPI created and assigned to employees' }
        }
      }
    },
    '/ai/smart-score': {
      post: {
        tags: ['AI'],
        summary: 'Evaluate goal title on SMART criteria using OpenAI',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Increase enterprise Q4 revenue by 20% through inbound partner sales' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'SMART score (0-100), feedback, and actionable suggestions' },
          400: { description: 'Title is missing or empty' },
          503: { description: 'OpenAI API key is not configured' }
        }
      }
    },
    '/ai/verify-achievement': {
      post: {
        tags: ['AI'],
        summary: 'Verify whether actual achievement value is realistic compared to goal target',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['achievement', 'goalTitle', 'target'],
                properties: {
                  achievement: { type: 'number', example: 120 },
                  goalTitle: { type: 'string', example: 'Close 10 enterprise deals' },
                  target: { type: 'number', example: 10 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Verification result (isRealistic, warning)' },
          400: { description: 'Missing required fields' },
          503: { description: 'OpenAI API key is not configured' }
        }
      }
    }
  }
};
