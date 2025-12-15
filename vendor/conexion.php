<?php

class Conexion extends mysqli
{
	private $existeError = false;
	private $errorMensaje = '';

	public function conectar()
	{
		// Habilitar excepciones en errores de MySQLi
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

		try {
			// Llamada al constructor de mysqli con los parámetros correctos
			parent::__construct(
				"waspserver.liberi.es", // Servidor
				"root", // Usuario
				"Coral18262202", // Contraseña
				"captura", // Base de datos
				3306 // Puerto (opcional, por defecto es 3306)
			);

			// Verificar errores
			if ($this->connect_errno) {
				$this->existeError = true;
				$this->errorMensaje = $this->connect_error;
			}
		} catch (mysqli_sql_exception $e) {
			$this->existeError = true;
			$this->errorMensaje = $e->getMessage();
		}
	}

	public function getExisteError(): bool
	{
		return $this->existeError;
	}

	public function getErrorMensaje(): string
	{
		return $this->errorMensaje;
	}
}
