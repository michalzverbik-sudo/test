<?php
// api/export_xls.php — export current CSV as HTML table with Excel MIME (so it opens in Excel)
$FILE = __DIR__ . '/../bol_data.csv';
date_default_timezone_set('Europe/Bratislava');
$fname = 'bol_data_' . date('Ymd_His') . '.xls';

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header('Content-Disposition: attachment; filename=' . $fname);

echo "<html><head><meta charset='UTF-8'></head><body>";
echo "<table border='1'>";

if (file_exists($FILE) && ($fh = fopen($FILE, 'r')) !== false) {
  // header
  if (($header = fgetcsv($fh)) !== false) {
    echo '<tr>'; foreach ($header as $h) { echo '<th>'.htmlspecialchars($h).'</th>'; } echo '</tr>';
  }
  // rows
  while (($r = fgetcsv($fh)) !== false) {
    echo '<tr>'; foreach ($r as $cell) { echo '<td>'.htmlspecialchars($cell).'</td>'; } echo '</tr>';
  }
  fclose($fh);
}
echo "</table></body></html>";
