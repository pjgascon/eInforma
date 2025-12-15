<?php
class Utilidades
{
    public static function codificarUTF($cadena): string
    {
        return mb_convert_encoding($cadena, "ISO-8859-1", "UTF-8");
    }

    public static function fecha2Mysql($fecha): string
    {
        $fecha = DateTime::createFromFormat('d/m/Y', $fecha);
        $fecha_convertida = $fecha->format('Y-m-d');
        return $fecha_convertida; // Salida: 2025/02/28
    }

    public static function obtenerNumeroDeCadena($cadena): string
    {
        preg_match('/\d+(\.\d+)?/', str_replace(",", ".", $cadena), $matches);
        return $matches[0];
    }

    public static function validarJson($json) {
        json_decode($json);
        return json_last_error() === JSON_ERROR_NONE;
    }
}
