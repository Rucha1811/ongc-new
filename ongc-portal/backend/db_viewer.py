import http.server
import json
import urllib.parse
import psycopg2

DB = "host=localhost port=5433 dbname=ongc_db user=ongc_user password=ongc_pass"

class DBHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            tables = self._get_tables()
            html = "<html><head><title>ONGC DB Viewer</title><style>body{font-family:Segoe UI,sans-serif;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1565c0;color:#fff}tr:nth-child(even){background:#f2f2f2}h2{color:#0b3d91;border-bottom:2px solid #1565c0;padding-bottom:5px}</style></head><body><h1>ONGC Database Viewer</h1>"
            html += "<h2>Tables</h2><ul>"
            for t in tables:
                html += f'<li><a href="/table?name={t[0]}">{t[0]}</a> ({t[1]} rows)</li>'
            html += "</ul></body></html>"
            self.wfile.write(html.encode())
        elif parsed.path == "/table":
            tname = params.get("name", [""])[0]
            self._show_table(tname)
    
    def _get_tables(self):
        conn = psycopg2.connect(DB)
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
        tables = [(r[0], 0) for r in cur.fetchall()]
        for i, (t, _) in enumerate(tables):
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{t}"')
                tables[i] = (t, cur.fetchone()[0])
            except:
                pass
        cur.close(); conn.close()
        return tables
    
    def _show_table(self, tname):
        conn = psycopg2.connect(DB)
        cur = conn.cursor()
        try:
            cur.execute(f'SELECT * FROM "{tname}" LIMIT 50')
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            html = f"<html><head><title>{tname}</title><style>body{{font-family:Segoe UI,sans-serif;margin:20px}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}}th{{background:#1565c0;color:#fff;position:sticky;top:0}}tr:nth-child(even){{background:#f2f2f2}}td{{max-width:300px;overflow:hidden;text-overflow:ellipsis}}a{{color:#1565c0}}</style></head><body><h2>{tname}</h2><p><a href='/'>← Back</a> | {len(rows)} rows</p><table><thead><tr>{''.join(f'<th>{c}</th>' for c in cols)}</tr></thead><tbody>"
            for r in rows:
                html += "<tr>" + "".join(f"<td>{str(c)[:100] if c is not None else ''}</td>" for c in r) + "</tr>"
            html += "</tbody></table></body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(str(e).encode())
        finally:
            cur.close(); conn.close()

http.server.HTTPServer(("0.0.0.0", 8081), DBHandler).serve_forever()
