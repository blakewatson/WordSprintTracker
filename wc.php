<?php
	$name = $_REQUEST["name"];
	$url = "http://nanowrimo.org/wordcount_api/wc/$name";
	
	$ch = curl_init( $url );
	
	curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
	
	$response = curl_exec( $ch );
	curl_close( $ch );
	
	echo $response;
?>