import { Router, Request, Response } from 'express';
import { Connection } from 'mysql2';
import { body, param, validationResult } from 'express-validator';
import authenticateToken from '../middleware/authMiddleware';

const blogRoutes = (db: Connection) => {
  const router = Router();

  // Handle errors
  function handleError(res: Response, errMsg: string): void {
    res.status(500).json({ error: errMsg });
  }

  // Public route: Get a listing of all active blog pages
  router.get('/pages', (req: Request, res: Response) => {
    const query = `
      SELECT pageId, description, path, title, DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate, active 
      FROM pages 
      WHERE active = 'yes' 
      ORDER BY publishedDate DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }

      const rows = results as any[];
      res.json(rows.map(row => ({
        pageId: row.pageId,
        path: row.path,
        title: row.title,
        publishedDate: row.publishedDate,
        active: row.active,
        description: row.description,
      })));
    });
  });

  // Protected route: Get a listing of all blog pages (active and non-active)
  router.get('/pages/all', authenticateToken, (req: Request, res: Response) => {
    const query = `
      SELECT pageId, description, path, title, DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate, active 
      FROM pages 
      ORDER BY publishedDate DESC
    `;

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }

      const rows = results as any[];
      res.json(rows.map(row => ({
        pageId: row.pageId,
        path: row.path,
        title: row.title,
        publishedDate: row.publishedDate,
        active: row.active,
        description: row.description,
      })));
    });
  });

  // Public route: Get an active page by its ID
  router.get('/pages/:id', param('id').isInt().withMessage('Invalid page ID'), (req: Request, res: Response) => {
    const id = db.escape(req.params.id);

    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = `
      SELECT
        pageId, path, title, description, content, 
        categories.categoryId, categories.name as categoryName,
        DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate,
        pages.active
      FROM pages
      INNER JOIN categories ON pages.categoryId = categories.categoryId
      WHERE pageId = ${id} AND active = 'yes'
    `;

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }

      const rows = results as any[];

      if (rows.length === 1) {
        const row = rows[0];
        res.json({
          pageId: row.pageId,
          path: row.path,
          title: row.title,
          description: row.description,
          content: row.content,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          publishedDate: row.publishedDate,
          active: row.active,
        });
      } else {
        res.status(404).json({ error: 'Page not found' });
      }
    });
  });

  // Protected route: Get a page by its ID (active and non-active)
  router.get('/pages/all/:id', authenticateToken, param('id').isInt().withMessage('Invalid page ID'), (req: Request, res: Response) => {
    const id = db.escape(req.params.id);

    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = `
      SELECT
        pageId, path, title, description, content, 
        categories.categoryId, categories.name as categoryName,
        DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate,
        pages.active
      FROM pages
      INNER JOIN categories ON pages.categoryId = categories.categoryId
      WHERE pageId = ${id}
    `;

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }

      const rows = results as any[];

      if (rows.length === 1) {
        const row = rows[0];
        res.json({
          pageId: row.pageId,
          path: row.path,
          title: row.title,
          description: row.description,
          content: row.content,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          publishedDate: row.publishedDate,
          active: row.active,
        });
      } else {
        res.status(404).json({ error: 'Page not found' });
      }
    });
  });

  // Sanitize HTML content
  function sanitizeHtml(html: string): string {
    return html.replace(/<\/?[^>]+(>|$)/g, ""); // Example of removing all HTML tags
  }

  // Protected route: Post a new blog page
  router.post('/pages', 
    authenticateToken,
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('content').trim().notEmpty().withMessage('Content is required'),
      body('description').trim().notEmpty().withMessage('Description is required'),
      body('setActive').isIn(['yes', 'no']).withMessage('Active status must be "yes" or "no"'),
      body('categoryId').isInt().withMessage('Category ID must be an integer'),
      body('path').trim().notEmpty().withMessage('Path is required'),
      body('publishedDate').isISO8601().withMessage('Invalid date format'),
    ],
    (req: Request, res: Response) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, description, setActive, categoryId, path, publishedDate } = req.body;

      const sanitizedContent = sanitizeHtml(content);
      const formattedDate = new Date(publishedDate).toISOString().split('T')[0]; // Convert to YYYY-MM-DD

      const query = `
        INSERT INTO pages (path, title, content, description, categoryId, publishedDate, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [path, title, sanitizedContent, description, categoryId, formattedDate, setActive];

      db.query(query, values, (err, results) => {
        if (err) {
          handleError(res, err.message);
          return;
        }
        res.json({ success: true, pageId: (results as any).insertId });
      });
    }
  );

  // Protected route: Update an existing blog page
  router.put('/pages/:id', 
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid page ID'),
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('content').trim().notEmpty().withMessage('Content is required'),
      body('description').trim().notEmpty().withMessage('Description is required'),
      body('setActive').isIn(['yes', 'no']).withMessage('Active status must be "yes" or "no"'),
      body('categoryId').isInt().withMessage('Category ID must be an integer'),
      body('path').trim().notEmpty().withMessage('Path is required'),
      body('publishedDate').isISO8601().withMessage('Invalid date format'),
    ],
    (req: Request, res: Response) => {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, description, setActive, categoryId, path, publishedDate } = req.body;
      const id = db.escape(req.params.id);

      const sanitizedContent = sanitizeHtml(content);
      const formattedDate = new Date(publishedDate).toISOString().split('T')[0]; // Convert to YYYY-MM-DD

      const query = `
        UPDATE pages 
        SET path = ?, title = ?, content = ?, description = ?, categoryId = ?, publishedDate = ?, active = ?
        WHERE pageId = ${id}
      `;

      const values = [path, title, sanitizedContent, description, categoryId, formattedDate, setActive];

      db.query(query, values, (err, results) => {
        if (err) {
          handleError(res, err.message);
          return;
        }
        res.json({ success: true });
      });
    }
  );

  // Protected route: Delete a page by its ID
  router.delete('/pages/:id', authenticateToken, param('id').isInt().withMessage('Invalid page ID'), (req: Request, res: Response) => {
    const id = db.escape(req.params.id);

    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = `DELETE FROM pages WHERE pageId = ${id}`;

    db.query(query, (err, results) => {
      if (err) {
        handleError(res, err.message);
        return;
      }
      res.json({ success: true });
    });
  });

  return router;
};

export default blogRoutes;
