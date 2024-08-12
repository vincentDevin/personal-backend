import { Router, Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { body, param, validationResult } from 'express-validator';
import authenticateToken from '../middleware/authMiddleware';

const blogRoutes = (db: Pool) => {
  const router = Router();

  // Handle errors with detailed logging
  function handleError(res: Response, err: Error): void {
    console.error('Error occurred:', err.message); // Log the error message for debugging
    res.status(500).json({ error: err.message });
  }

  // Public route: Get a listing of all active blog pages
  router.get('/pages', async (req: Request, res: Response) => {
    const query = `
      SELECT pageId, description, path, title, DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate, active 
      FROM pages 
      WHERE active = 'yes' 
      ORDER BY publishedDate DESC
    `;

    try {
      const [rows] = await db.query(query);
      res.json((rows as any[]).map(row => ({
        pageId: row.pageId,
        path: row.path,
        title: row.title,
        publishedDate: row.publishedDate,
        active: row.active,
        description: row.description,
      })));
    } catch (err) {
      handleError(res, err as Error);
    }
  });

  // Protected route: Get a listing of all blog pages (active and non-active) for control panel
  router.get('/control-panel/pages/all', authenticateToken, async (req: Request, res: Response) => {
    const query = `
      SELECT pageId, description, path, title, DATE_FORMAT(publishedDate, '%m/%e/%Y') as publishedDate, active 
      FROM pages 
      ORDER BY publishedDate DESC
    `;

    try {
      const [rows] = await db.query(query);
      res.json((rows as any[]).map(row => ({
        pageId: row.pageId,
        path: row.path,
        title: row.title,
        publishedDate: row.publishedDate,
        active: row.active,
        description: row.description,
      })));
    } catch (err) {
      handleError(res, err as Error);
    }
  });

  // Public route: Get an active page by its ID
  router.get('/pages/:id', param('id').isInt().withMessage('Invalid page ID'), async (req: Request, res: Response) => {
    const id = req.params.id;

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
      WHERE pageId = ? AND active = 'yes'
    `;

    try {
      const [rows] = await db.query(query, [id]);
      if ((rows as any[]).length === 1) {
        const row = (rows as any[])[0];
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
    } catch (err) {
      handleError(res, err as Error);
    }
  });

  // Protected route: Get a page by its ID (active and non-active) for control panel
  router.get('/control-panel/pages/all/:id', authenticateToken, param('id').isInt().withMessage('Invalid page ID'), async (req: Request, res: Response) => {
    const id = req.params.id;

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
      WHERE pageId = ?
    `;

    try {
      const [rows] = await db.query(query, [id]);
      if ((rows as any[]).length === 1) {
        const row = (rows as any[])[0];
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
    } catch (err) {
      handleError(res, err as Error);
    }
  });

  // Sanitize HTML content
  function sanitizeHtml(html: string): string {
    return html.replace(/<\/?[^>]+(>|$)/g, ""); // Example of removing all HTML tags
  }

  // Protected route: Post a new blog page from control panel
  router.post('/control-panel/pages', 
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
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, description, setActive, categoryId, path, publishedDate } = req.body;

      const sanitizedContent = sanitizeHtml(content);
      const formattedDate = publishedDate ? 
        new Date(publishedDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0]; // Default to today's date

      const query = `
        INSERT INTO pages (path, title, content, description, categoryId, publishedDate, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [path, title, sanitizedContent, description, categoryId, formattedDate, setActive];

      try {
        const [results] = await db.query(query, values);
        res.json({ success: true, pageId: (results as any).insertId });
      } catch (err) {
        handleError(res, err as Error);
      }
    }
  );

  // Protected route: Update an existing blog page from control panel
  router.put('/control-panel/pages/:id', 
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
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, description, setActive, categoryId, path, publishedDate } = req.body;
      const id = req.params.id;

      const sanitizedContent = sanitizeHtml(content);
      const formattedDate = publishedDate ? 
        new Date(publishedDate).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0]; // Default to today's date

      const query = `
        UPDATE pages 
        SET path = ?, title = ?, content = ?, description = ?, categoryId = ?, publishedDate = ?, active = ?
        WHERE pageId = ?
      `;

      const values = [path, title, sanitizedContent, description, categoryId, formattedDate, setActive, id];

      try {
        await db.query(query, values);
        res.json({ success: true });
      } catch (err) {
        handleError(res, err as Error);
      }
    }
  );

  // Protected route: Delete a page by its ID from control panel
  router.delete('/control-panel/pages/:id', authenticateToken, param('id').isInt().withMessage('Invalid page ID'), async (req: Request, res: Response) => {
    const id = req.params.id;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const query = `DELETE FROM pages WHERE pageId = ?`;

    try {
      await db.query(query, [id]);
      res.json({ success: true });
    } catch (err) {
      handleError(res, err as Error);
    }
  });

  return router;
};

export default blogRoutes;
